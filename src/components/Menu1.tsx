import Image from "next/image";
import Link from "next/link";
import { HouseIcon, CalendarCheck, Users,ListChecks, LibraryBig, ChartBarBig ,Info, Settings, LogOut} from "lucide-react";

const menuItems1 = [
  {
    title: "MENU",
    items: [
      {
        icon: <HouseIcon />,
        label: "Home",
        href: "/funcionarios",
      },
      {
        icon: <CalendarCheck />,
        label: "Pedir Dispensas",
        href: "/menu/pedir_dispensa",
        
      },
      {
        icon: <ListChecks />,
        label: "Minha Assiduidade",
        href: "/menu/assiduidade",
      },
      {
        icon: <LibraryBig />,
        label: "Minhas Formações",
        href: "/menu/formacoes",
      },
      {
        icon: <ChartBarBig />,
        label: "Perfomance",
        href: "/list/Perfomance",
      },
    ],
  },
  {
    title: "OUTROS",
    items: [
      {
        icon: <Info />,
        label: "Suporte",
        href: "/Suporte",
      },
      {
        icon: <Settings />,
        label: "Definições",
        href: "/Definições",
      },
      {
        icon: <LogOut />,
        label: "Sair",
        href: "/Sair",
      },
    ],
  },
];

const Menu1 = () => {
  return (
    <div className="mt-4 text-sm">
      {menuItems1.map((i) => (
        <div className="flex flex-col gap-2 py-4" key={i.title}>
          {i.items.map((item) => {
            return (
              <Link
                  href={item.href}
                  key={item.label}
                  className="flex items-center justify-center lg:justify-start gap-4 text-white py-2 md:px-2 rounded-md hover:bg-lamaSkyLight transition-colors duration-200 hover:text-blue-400"
                >
                  {typeof item.icon === "string" ? (
                    <Image src={item.icon} alt="" width={25} height={25} />
                  ) : (
                    item.icon
                  )}
                  <span className="hidden lg:block">{item.label}</span>
                </Link>
              );
          })}
        </div>
      ))}
    </div>
  );
};

export default Menu1;
